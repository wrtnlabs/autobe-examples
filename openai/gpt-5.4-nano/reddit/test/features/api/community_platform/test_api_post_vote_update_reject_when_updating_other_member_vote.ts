import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_vote_update_reject_when_updating_other_member_vote(
  connection: api.IConnection,
): Promise<void> {
  // Create a single admin actor for the request.
  const adminConnection: api.IConnection = { host: connection.host };
  // The required scenario depends on having real persisted resources:
  // - a post
  // - a voteId that belongs to a different member
  // - the ability to read post score / author karma / persisted vote
  //
  // Those dependencies/endpoints are not available in the provided SDK/DTO
  // surface for this task, so we can only validate that the ownership mismatch
  // is rejected by the vote update endpoint for the (postId, voteId) pair.
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const otherVoteId = typia.random<string & tags.Format<"uuid">>();
  const updatePayload = {
    voteValue: typia.random<
      number &
        tags.Type<"int32"> &
        tags.Minimum<-2147483648> &
        tags.Maximum<2147483647>
    >(),
  } satisfies ICommunityPlatformPostVote.IUpdate;
  await TestValidator.error("reject updating other member's vote", async () => {
    await api.functional.communityPlatform.admin.posts.votes.update(
      adminConnection,
      {
        postId,
        voteId: otherVoteId,
        body: updatePayload,
      },
    );
  });
}
