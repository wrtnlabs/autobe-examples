import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_reddit_community_admin_communities_files_create } from "../../../generate/generate_random_reddit_community_admin_communities_files_create";
import { prepare_random_reddit_community_community_file } from "../../../prepare/prepare_random_reddit_community_community_file";

export async function test_api_community_file_upload_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare initial file upload data with unique file_path
  const filePath = `community_files/${typia.random<string & tags.Format<"uuid">>}/logo.png`;
  const fileBody = {
    file_path: filePath,
    filename: "logo.png",
    mime_type: "image/png",
    file_size: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1>
    >() satisfies number,
  } satisfies IRedditCommunityCommunityFile.ICreate;
  // 3. Create a community ID (using generated UUID since we can't create community via API)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Upload first file (should succeed)
  const firstFile =
    await api.functional.redditCommunity.admin.communities.files.create(
      adminConnection,
      {
        communityId,
        body: fileBody,
      },
    );
  typia.assert(firstFile);
  // 5. Attempt duplicate upload with same file_path (should fail with 409)
  await TestValidator.error("duplicate file_path rejected", async () => {
    await api.functional.redditCommunity.admin.communities.files.create(
      adminConnection,
      {
        communityId,
        body: fileBody,
      },
    );
  });
}
