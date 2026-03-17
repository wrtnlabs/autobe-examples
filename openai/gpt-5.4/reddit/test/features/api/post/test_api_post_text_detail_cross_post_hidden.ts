import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_text_detail_cross_post_hidden(
  connection: api.IConnection,
): Promise<void> {
  const viewerConnection: api.IConnection = { host: connection.host };
  const postId = typia.random<string & tags.Format<"uuid">>();
  const textId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals(
    "cross-post identifiers should differ",
    postId,
    textId,
  );
  await TestValidator.httpError(
    "cross-post text detail must be hidden as not-found style failure",
    [404, 422],
    async () => {
      await api.functional.communityPlatform.posts.texts.at(viewerConnection, {
        postId,
        textId,
      });
    },
  );
}
