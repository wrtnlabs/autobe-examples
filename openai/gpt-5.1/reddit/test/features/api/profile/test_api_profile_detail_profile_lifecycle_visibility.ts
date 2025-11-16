import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_profile_detail_profile_lifecycle_visibility(
  connection: api.IConnection,
) {
  // 1. Register a member user to establish an authenticated context
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  // 2. Create a community as a realistic prerequisite environment
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Retrieve a public profile by handle using the public profiles endpoint.
  //    Since we don't have a direct mapping from member user to profile handle,
  //    we call the endpoint with a random handle that the backend (or simulator)
  //    may resolve. Once a successful profile is returned, we treat it as the
  //    active public profile under test.
  const candidateHandle: string = RandomGenerator.alphabets(12);

  const publicProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.profiles.at(connection, {
      handle: candidateHandle,
    });
  typia.assert<ICommunityPlatformUserProfile>(publicProfile);

  // Validate core invariants of a public-facing profile response
  TestValidator.predicate(
    "public profile should have a non-empty handle",
    publicProfile.handle.length > 0,
  );
  TestValidator.equals(
    "profile handle in response matches requested handle",
    publicProfile.handle,
    candidateHandle,
  );
  TestValidator.predicate(
    "profile visibility flag should allow public access",
    publicProfile.is_profile_public === true,
  );

  // 4. Confirm that the profile is also accessible without authentication,
  //    demonstrating that the endpoint is public at the transport layer.
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const anonymousProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.profiles.at(anonymousConnection, {
      handle: publicProfile.handle,
    });
  typia.assert<ICommunityPlatformUserProfile>(anonymousProfile);

  TestValidator.equals(
    "anonymous access returns same handle as authenticated access",
    anonymousProfile.handle,
    publicProfile.handle,
  );
  TestValidator.equals(
    "anonymous access returns same public visibility flag",
    anonymousProfile.is_profile_public,
    publicProfile.is_profile_public,
  );

  // 5. Call the endpoint with a different, likely non-existing handle and
  //    assert that some error is raised. We do not assert specific HTTP
  //    status codes, only that the call fails rather than leaking arbitrary
  //    data for unrelated handles.
  const otherHandle: string = RandomGenerator.alphabets(16);

  await TestValidator.error(
    "non-matching handle should not return a valid profile",
    async () => {
      await api.functional.communityPlatform.profiles.at(connection, {
        handle: otherHandle,
      });
    },
  );
}
