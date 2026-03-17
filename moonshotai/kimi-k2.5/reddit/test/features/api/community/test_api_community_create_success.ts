import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test the primary success path of community creation by an authenticated member.
 *
 * 1. Member joins the platform using authorize_member_join
 * 2. Creates a community with valid name and description
 * 3. Validates the response contains generated UUID, owner as the member, timestamps, and subscriber_count 0
 */
export async function test_api_community_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member - use utility function (not SDK directly)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.Format<"password">
      >(),
    },
  });
  typia.assert(authorizedMember);
  // Step 2: Create community using generation utility (MUST use over SDK)
  const createdCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
          description: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<500>
          >(),
        },
      },
    );
  // Step 3: Validate response structure and business logic
  typia.assert(createdCommunity);
  // Verify ownership - the creator should be the owner
  TestValidator.equals(
    "Community owner should match authenticated member",
    createdCommunity.owner.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "Community owner email should match authenticated member",
    createdCommunity.owner.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "Community owner username should match authenticated member",
    createdCommunity.owner.username,
    authorizedMember.username,
  );
  // Verify initial state
  TestValidator.equals(
    "Subscriber count should be 0 for new community",
    createdCommunity.subscriber_count,
    0,
  );
  TestValidator.predicate(
    "Created at should be set",
    createdCommunity.created_at !== null,
  );
  TestValidator.predicate(
    "Updated at should be set",
    createdCommunity.updated_at !== null,
  );
  TestValidator.equals(
    "Deleted at should be null",
    createdCommunity.deleted_at,
    null,
  );
  // Verify icon is null when not provided
  TestValidator.equals(
    "Icon should be null when not provided",
    createdCommunity.icon,
    null,
  );
}
