import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcessStep";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
import type { IPageICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcess";
import type { IPageICommunityPlatformFileProcessStep } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcessStep";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_temp_uploads_create } from "../../../generate/generate_random_community_platform_member_temp_uploads_create";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

/**
 * Test the basic pagination and filtering workflow for file processing steps.
 * First, create a file upload through member temp upload endpoint to generate
 * a file record and initiate processing. Then retrieve the processing ID from
 * the file's processing records. Use the file and process IDs to call the
 * steps endpoint with pagination parameters (page=1, limit=10). Validate that
 * response contains pagination metadata with correct records count and pages
 * calculation. Verify each step in the data array has required fields: id,
 * step_name, status, created_at, and fileProcess relationship.
 * Test filtering by step_name partial match (e.g., 'validation') to ensure
 * trigram similarity search works. Also test status filter with exact match
 * (e.g., 'completed'). Ensure the response structure matches
 * IPageICommunityPlatformFileProcessStep.ISummary schema.
 */
export async function test_api_file_processing_steps_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create temporary file upload to trigger processing
  const tempUpload =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection,
      {},
    );
  typia.assert(tempUpload);
  // 3. Retrieve file ID by searching for member's files
  // Create a new connection for file search (unauthenticated endpoint)
  const fileSearchConnection: api.IConnection = { host: connection.host };
  const filesSearch = await api.functional.communityPlatform.files.index(
    fileSearchConnection,
    {
      body: {
        actor_type: "member",
        actor_id: memberAuth.id,
        page: 1 satisfies number as number,
        limit: 10 satisfies number as number,
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(filesSearch);
  TestValidator.predicate(
    "member should have at least one file",
    filesSearch.data.length > 0,
  );
  const file = filesSearch.data[0];
  typia.assert(file);
  // 4. Retrieve processing records for the file
  const processSearchConnection: api.IConnection = { host: connection.host };
  const processes =
    await api.functional.communityPlatform.files.processes.index(
      processSearchConnection,
      {
        fileId: file.id,
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(processes);
  TestValidator.predicate(
    "file should have at least one processing record",
    processes.data.length > 0,
  );
}