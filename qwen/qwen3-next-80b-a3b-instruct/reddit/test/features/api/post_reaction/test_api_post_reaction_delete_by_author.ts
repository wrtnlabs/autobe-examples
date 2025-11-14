import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReaction";

export async function test_api_post_reaction_delete_by_author(
  connection: api.IConnection,
) {
  const postCode: string = typia.random<string>();
  const createdReaction: ICommunityPlatformReaction =
    await api.functional.communityPlatform.member.posts.reactions.create(
      connection,
      {
        postCode,
        body: {
          type: "like" as const,
        } satisfies ICommunityPlatformReaction.ICreate,
      },
    );
  typia.assert(createdReaction);

  const deletedReaction: ICommunityPlatformReaction =
    await api.functional.communityPlatform.member.posts.reactions.erase(
      connection,
      {
        postCode,
      },
    );
  typia.assert(deletedReaction);

  TestValidator.equals(
    "deleted reaction matches created reaction",
    deletedReaction,
    createdReaction,
  );
}
