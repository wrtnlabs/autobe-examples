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

export async function test_api_post_text_detail_public_full_body(
  connection: api.IConnection,
): Promise<void> {
  const publicConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  TestValidator.equals(
    "public connection has no authorization header",
    publicConnection.headers?.authorization,
    undefined,
  );
  const output = await api.functional.communityPlatform.posts.texts.at(
    publicConnection,
    {
      postId: typia.random<string & tags.Format<"uuid">>(),
      textId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert<ICommunityPlatformPostText>(output);
}
