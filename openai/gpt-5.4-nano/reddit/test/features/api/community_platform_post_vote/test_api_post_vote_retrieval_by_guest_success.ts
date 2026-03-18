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

export async function test_api_post_vote_retrieval_by_guest_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join (creates guest identity and sets Authorization header)
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string & tags.Format<"uuid">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(guest);
  // Use ONLY actor-specific connection
  const postId = typia.random<string & tags.Format<"uuid">>();
  const voteId = typia.random<string & tags.Format<"uuid">>();
  // 3) Retrieve vote by guest
  const vote = await api.functional.communityPlatform.guest.posts.votes.at(
    guestConnection,
    {
      postId,
      voteId,
    },
  );
  typia.assert(vote);
  // 4) Validate scoping and fields
  TestValidator.equals(
    "communityPlatformPostId matches postId",
    vote.communityPlatformPostId,
    postId,
  );
  TestValidator.equals("vote id matches voteId", vote.id, voteId);
  if (vote.deletedAt === null) {
    TestValidator.predicate(
      "votedAt is not after updatedAt for active vote",
      new Date(vote.votedAt).getTime() <= new Date(vote.updatedAt).getTime(),
    );
  }
}
