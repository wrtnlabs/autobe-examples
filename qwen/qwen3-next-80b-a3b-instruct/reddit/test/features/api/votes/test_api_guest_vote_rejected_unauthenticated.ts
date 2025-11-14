import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

export async function test_api_guest_vote_rejected_unauthenticated(
  connection: api.IConnection,
) {
  const postCode = typia.random<string & tags.Pattern<"^[a-zA-Z0-9]{6,16}$">>();
  await TestValidator.error(
    "unauthenticated guest vote should be rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.castVote(
        connection,
        {
          postCode,
        },
      );
    },
  );
}
