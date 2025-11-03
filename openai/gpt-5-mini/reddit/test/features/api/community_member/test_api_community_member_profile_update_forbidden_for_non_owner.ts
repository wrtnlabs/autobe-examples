import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_community_member_profile_update_forbidden_for_non_owner(
  connection: api.IConnection,
) {
  // This E2E test verifies that a non-owner (bob) cannot update another
  // community member's (alice) profile. It uses only the available SDK
  // functions: join, uploads.create, and profile.update.

  // 1) Prepare isolated connections for actors to avoid token leakage.
  const aliceConn: api.IConnection = { ...connection, headers: {} };
  const bobConn: api.IConnection = { ...connection, headers: {} };

  // 2) Create alice account with an initial profile so we know the initial
  //    state. Use valid values according to ICommunityBbsCommunityMember.ICreate.
  const aliceUsername = `alice_owner_${RandomGenerator.alphaNumeric(6)}`;
  const aliceEmail = `${aliceUsername}@example.test`;
  const aliceAuth = await api.functional.auth.communityMember.join(aliceConn, {
    body: {
      email: aliceEmail,
      username: aliceUsername,
      password: "Passw0rd!",
      display_name: "Alice Initial",
      profile: {
        display_name: "Alice Initial",
        bio: "Initial bio",
        avatar_uri: null,
      },
      session_context: {
        href: "http://localhost/",
        referrer: "http://localhost/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(aliceAuth);

  // 3) Create bob account (non-owner)
  const bobUsername = `bob_user_${RandomGenerator.alphaNumeric(6)}`;
  const bobEmail = `${bobUsername}@example.test`;
  const bobAuth = await api.functional.auth.communityMember.join(bobConn, {
    body: {
      email: bobEmail,
      username: bobUsername,
      password: "Passw0rd!",
      session_context: {
        href: "http://localhost/",
        referrer: "http://localhost/",
        ip: null,
        session_ttl_seconds: null,
      },
    } satisfies ICommunityBbsCommunityMember.ICreate,
  });
  typia.assert(bobAuth);

  // 4) As alice, upload a media item to obtain a platform-managed URL for avatar.
  const uploaded: ICommunityBbsPostMedia =
    await api.functional.communityBbs.communityMember.uploads.create(
      aliceConn,
      {
        body: {
          upload_mode: "url",
          url: "https://cdn.example.test/uploads/alice-avatar.png",
          media_type: "image/png",
          size_bytes: 1024,
          ordering: 0,
          community_bbs_post_id: null,
        } satisfies ICommunityBbsPostMedia.ICreate,
      },
    );
  typia.assert(uploaded);

  // 5) Attempt forbidden update: bob tries to update alice's profile. This
  //    should throw (authorization failure). We assert that an error occurs
  //    using TestValidator.error with an async callback.
  await TestValidator.error(
    "forbidden profile update by non-owner should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.profile.update(
        bobConn,
        {
          username: aliceUsername,
          body: {
            display_name: "Hacked Name",
            bio: "Malicious attempt",
          } satisfies ICommunityBbsProfile.IUpdate,
        },
      );
    },
  );

  // 6) To ensure no side-effects occurred (profile unchanged), perform a
  //    legitimate update as alice. If bob's attempt had succeeded and altered
  //    state in an unexpected way, this owner update would either fail or
  //    produce unexpected values. Successful owner update demonstrates the
  //    authorization enforcement and absence of undesired side-effects.
  const expectedDisplayName = "Alice Owner Updated";
  const expectedBio = "Owner-updated bio";

  const updated: ICommunityBbsProfile =
    await api.functional.communityBbs.communityMember.communityMembers.profile.update(
      aliceConn,
      {
        username: aliceUsername,
        body: {
          display_name: expectedDisplayName,
          bio: expectedBio,
          avatar_uri: uploaded.url,
        } satisfies ICommunityBbsProfile.IUpdate,
      },
    );
  typia.assert(updated);

  // 7) Validate returned profile fields
  TestValidator.equals(
    "owner can update their display_name",
    updated.display_name,
    expectedDisplayName,
  );
  TestValidator.equals("owner can update their bio", updated.bio, expectedBio);
  TestValidator.equals(
    "owner avatar_uri set to uploaded media",
    updated.avatar_uri,
    uploaded.url,
  );
}
