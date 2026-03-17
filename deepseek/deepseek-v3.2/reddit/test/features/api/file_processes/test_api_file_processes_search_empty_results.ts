import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileProcess";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFileProcess } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileProcess";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_files_upload } from "../../../generate/generate_random_community_platform_member_files_upload";
import { prepare_random_community_platform_temp_upload } from "../../../prepare/prepare_random_community_platform_temp_upload";

export async function test_api_file_processes_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and register a member
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
  // Upload a file using the member connection - let utility handle the request body
  const tempUpload =
    await generate_random_community_platform_member_files_upload(
      memberConnection,
      {},
    );
  typia.assert(tempUpload);
  // Query processing records for the uploaded file
  const fileId = tempUpload.file.id;
  const page = await api.functional.communityPlatform.files.processes.index(
    memberConnection,
    {
      fileId,
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies ICommunityPlatformFileProcess.IRequest,
    },
  );
  typia.assert(page);
  // Validate empty results
  TestValidator.equals(
    "data should be empty array when no processing records exist",
    page.data,
    [],
  );
  TestValidator.equals(
    "pagination.records should be 0",
    page.pagination.records,
    0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    page.pagination.pages,
    0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination.current should be 1",
    page.pagination.current,
    1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );
  TestValidator.equals(
    "pagination.limit should match request limit",
    page.pagination.limit,
    10 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
  );
}
