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

export async function test_api_community_file_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Upload file for community
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const file =
    await api.functional.redditCommunity.admin.communities.files.create(
      adminConnection,
      {
        communityId,
        body: {
          file_path: `https://storage.example.com/files/${typia.random<(string & tags.Format<"uuid">)>()}.png`,
          filename: RandomGenerator.name() + ".png",
          mime_type: "image/png",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IRedditCommunityCommunityFile.ICreate,
      },
    );
  typia.assert(file);
  // 3. Validate business logic
  TestValidator.equals("community_id matches", file.community_id, communityId);
  TestValidator.equals(
    "file_path is valid URI",
    file.file_path.startsWith("https://"),
    true,
  );
  TestValidator.equals(
    "mime_type is image format",
    file.mime_type.startsWith("image/"),
    true,
  );
  TestValidator.predicate("file_size is positive", file.file_size > 0);
  TestValidator.equals("deleted_at is null", file.deleted_at, null);
  TestValidator.equals("community has id", file.community.id !== null, true);
  TestValidator.equals(
    "community has name",
    file.community.name.length > 0,
    true,
  );
  TestValidator.equals(
    "community has created_at",
    file.community.created_at !== null,
    true,
  );
}