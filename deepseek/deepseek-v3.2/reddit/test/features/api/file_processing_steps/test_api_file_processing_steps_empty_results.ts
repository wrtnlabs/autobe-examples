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

export async function test_api_file_processing_steps_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member join and create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a temporary upload using the utility function
  // This creates a file record and initiates processing as per scenario dependencies
  const tempUpload =
    await generate_random_community_platform_member_temp_uploads_create(
      memberConnection,
      {
        body: {
          communityPlatformFileId: typia.random<string & tags.Format<"uuid">>(),
          originalFilename: RandomGenerator.alphaNumeric(10) + ".jpg",
          mimeType: "image/jpeg",
          fileSize: typia.random<number & tags.Type<"int32">>(),
          contentHash: RandomGenerator.alphaNumeric(64),
          uploadIp: typia.random<string & tags.Format<"ipv4">>(),
          userAgent: RandomGenerator.alphaNumeric(20),
        } satisfies ICommunityPlatformTempUpload.ICreate,
      },
    );
  typia.assert(tempUpload);
  // 3. Retrieve the file metadata to get file ID
  const fileList = await api.functional.communityPlatform.files.index(
    memberConnection,
    {
      body: {
        actor_id: member.id,
        actor_type: "member",
      } satisfies ICommunityPlatformFile.IRequest,
    },
  );
  typia.assert(fileList);
  TestValidator.predicate(
    "file list has at least one file",
    fileList.data.length > 0,
  );
  const file = fileList.data[0];
  // 4. Get processing records for the file to obtain process ID
  const processList =
    await api.functional.communityPlatform.files.processes.index(
      memberConnection,
      {
        fileId: file.id,
        body: {} satisfies ICommunityPlatformFileProcess.IRequest,
      },
    );
  typia.assert(processList);
  TestValidator.predicate(
    "process list has at least one process",
    processList.data.length > 0,
  );
  const process = processList.data[0];
  // 5. Test 1: Filter by nonexistent step name
  const steps1 =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          step_name: "nonexistent_step",
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(steps1);
  TestValidator.equals(
    "empty data array for nonexistent step",
    steps1.data,
    [],
  );
  TestValidator.equals(
    "pagination records = 0 for nonexistent step",
    steps1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for nonexistent step",
    steps1.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = 1 for nonexistent step",
    steps1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit > 0 for nonexistent step",
    steps1.pagination.limit > 0,
  );
  // 6. Test 2: Filter by nonexistent status (assuming all steps are 'completed')
  const steps2 =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          status: "pending",
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(steps2);
  TestValidator.equals("empty data array for pending status", steps2.data, []);
  TestValidator.equals(
    "pagination records = 0 for pending status",
    steps2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for pending status",
    steps2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = 1 for pending status",
    steps2.pagination.current,
    1,
  );
  // 7. Test 3: Combined filter that yields no results
  const steps3 =
    await api.functional.communityPlatform.files.processes.steps.index(
      memberConnection,
      {
        fileId: file.id,
        processId: process.id,
        body: {
          step_name: "validation",
          status: "failed",
        } satisfies ICommunityPlatformFileProcessStep.IRequest,
      },
    );
  typia.assert(steps3);
  TestValidator.equals(
    "empty data array for validation+failed",
    steps3.data,
    [],
  );
  TestValidator.equals(
    "pagination records = 0 for validation+failed",
    steps3.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages = 0 for validation+failed",
    steps3.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current = 1 for validation+failed",
    steps3.pagination.current,
    1,
  );
}
