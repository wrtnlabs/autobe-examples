import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_community_create_member_auth(
  connection: api.IConnection,
) {
  // Step 1: Authenticate member by joining
  const email: string = typia.random<string & tags.Format<"email">>();
  const username: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(memberAuth);

  // Step 2: Create new community with authenticated connection
  const communityName: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9-]+$">
  >();
  const communityDescription: string | undefined = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // Step 3: Validate community properties
  TestValidator.equals(
    "community name matches",
    createdCommunity.name,
    communityName,
  );
  TestValidator.equals("community is public", createdCommunity.isPublic, true);
  TestValidator.equals("community is not NSFW", createdCommunity.nsfw, false);
  TestValidator.predicate(
    "community has valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      createdCommunity.id,
    ),
  );
  TestValidator.predicate(
    "community has valid creation date",
    Date.parse(createdCommunity.createdAt) > 0,
  );
  TestValidator.equals(
    "community member count is 0",
    createdCommunity.memberCount,
    0,
  );
  TestValidator.equals(
    "community post count is 0",
    createdCommunity.postCount,
    0,
  );
  TestValidator.equals(
    "community post review mode is false",
    createdCommunity.postReviewMode,
    false,
  );
  TestValidator.equals(
    "community comment review mode is false",
    createdCommunity.commentReviewMode,
    false,
  );

  // Ensure description matches if provided
  if (communityDescription !== undefined) {
    TestValidator.equals(
      "community description matches",
      createdCommunity.description,
      communityDescription,
    );
  } else {
    TestValidator.equals(
      "community description is null",
      createdCommunity.description,
      null,
    );
  }
}
