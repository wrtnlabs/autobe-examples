import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_posts_new_create } from "../../../generate/generate_random_community_member_posts_new_create";
import { generate_random_community_member_subscriptions_create } from "../../../generate/generate_random_community_member_subscriptions_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";
import { prepare_random_community_subscription } from "../../../prepare/prepare_random_community_subscription";

export async function test_api_post_create_link_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
  } satisfies ICommunityMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(member);
  // 2. Generate a unique community ID for subscription
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Subscribe member to community
  const subscriptionData = {
    community_member_id: member.token.access, // Use the JWT access token as community_member_id (per API implementation constraint as DTO is empty)
    community_community_id: communityId,
  } satisfies ICommunitySubscription.ICreate;
  const subscription =
    await generate_random_community_member_subscriptions_create(
      memberConnection,
      { body: subscriptionData },
    );
  typia.assert(subscription);
  // 4. Create a link post with valid title and HTTPS URL
  const linkData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 10 }),
    url: "https://example.com/" + RandomGenerator.alphaNumeric(10),
    community_id: communityId,
  } satisfies ICommunityPost.ICreate;
  const post = await generate_random_community_member_posts_new_create(
    memberConnection,
    { body: linkData },
  );
  typia.assert(post);
  // 5. Validate the created post
  // Assert post as the expected structure with correct property names
  const validatedPost = typia.assert<ICommunityPost & { title: string; status: string; vote_score: number; community_id: string }>(post);
  TestValidator.equals(
    "title length is between 5-300",
    validatedPost.title.length >= 5 && validatedPost.title.length <= 300,
    true,
  );
  TestValidator.equals("post status is approved", validatedPost.status, "approved");
  TestValidator.equals("vote score is 0", validatedPost.vote_score, 0);
  TestValidator.equals("community_id matches", validatedPost.community_id, communityId);
}