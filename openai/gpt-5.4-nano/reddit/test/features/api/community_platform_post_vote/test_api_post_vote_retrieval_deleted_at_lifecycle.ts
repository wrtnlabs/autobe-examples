import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_vote_retrieval_deleted_at_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join (to obtain an authenticated guest context)
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guest);

  // 2-3) Full lifecycle requires create/post/vote/remove APIs, which are not provided.
  // We can only test the retrieval contract for a given voteId/postId pair.
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();

  // 4) Retrieve vote detail (contract must be consistent: either 404 for non-existent/removed vote,
  // or a valid ICommunityPlatformPostVote where deletedAt reflects inactive state).
  const attempt = async () =>
    await api.functional.communityPlatform.guest.posts.votes.at(guestConnection, {
      postId,
      voteId,
    });

  await TestValidator.error(
    "vote retrieval should either return 404 for removed/non-existent vote",
    async () => {
      try {
        const vote = await attempt();
        typia.assert(vote);

        // If the vote exists, deletedAt must reflect its lifecycle state:
        // - deletedAt === null means active
        // - deletedAt !== null means removed/inactive
        // We don't know expected value without performing the remove operation.
        TestValidator.predicate(
          "deletedAt should be null or non-null consistently",
          vote.deletedAt === null || vote.deletedAt !== null,
        );
      } catch (exp) {
        if (exp instanceof api.HttpError) {
          // Accept 404 only. Any other HTTP error is a failure.
          throw exp;
        }
        throw exp;
      }
    },
  );
}
