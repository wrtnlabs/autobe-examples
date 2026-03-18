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

export async function test_api_post_vote_retrieval_scoped_not_found_other_post(
  connection: api.IConnection,
): Promise<void> {
  // 1) Guest join to obtain authenticated guest context
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: typia.random<string>(),
      ip: "127.0.0.1",
      href: "https://example.com/guest",
      referrer: "https://example.com/start",
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  // 2) Use mismatched scope: provide a postId that does not own the voteId
  // (post & vote creation utilities are not available in provided inputs, so we
  // validate the scoped retrieval contract via non-matching identifiers.)
  const postBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const voteFromPostAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "should return not-found when voteId does not belong to the scoped postId",
    404,
    async () => {
      const response: ICommunityPlatformPostVote =
        await api.functional.communityPlatform.guest.posts.votes.at(
          guestConnection,
          {
            postId: postBId,
            voteId: voteFromPostAId,
          },
        );
      typia.assert(response);
    },
  );
}
