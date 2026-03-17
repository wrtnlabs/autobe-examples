import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityKarmaSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityKarmaSnapshot";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_karma_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate two members
  const voterConnection: api.IConnection = { host: connection.host };
  const voterResult = await api.functional.redditCommunity.auth.member.join(
    voterConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityMember.IJoin,
    },
  );
  typia.assert(voterResult);
  voterConnection.headers = {
    Authorization: voterResult.token.access,
  };
  const karmaRecipientConnection: api.IConnection = { host: connection.host };
  const karmaRecipientResult =
    await api.functional.redditCommunity.auth.member.join(
      karmaRecipientConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityMember.IJoin,
      },
    );
  typia.assert(karmaRecipientResult);
  karmaRecipientConnection.headers = {
    Authorization: karmaRecipientResult.token.access,
  };
  // 2. Karma recipient casts an upvote on a post to trigger karma snapshot
  const targetPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const vote = await api.functional.redditCommunity.member.votes.create(
    karmaRecipientConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: targetPostId,
        target_comment_id: undefined,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(vote);
  // 3. Retrieve a karma snapshot by ID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.redditCommunity.member.karma_snapshots.at(
      karmaRecipientConnection,
      {
        karmaSnapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contents
  TestValidator.equals(
    "snapshot has user reference",
    snapshot.user !== undefined,
    true,
  );
  TestValidator.equals(
    "user has username",
    snapshot.user.username.length > 0,
    true,
  );
  TestValidator.equals(
    "vote direction is upvote",
    snapshot.vote.vote_type,
    "upvote",
  );
  TestValidator.equals("karma_delta is +1", snapshot.karma_delta, 1);
  TestValidator.predicate(
    "karma_after_change is integer",
    Number.isInteger(snapshot.karma_after_change),
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(snapshot.created_at)),
  );
}