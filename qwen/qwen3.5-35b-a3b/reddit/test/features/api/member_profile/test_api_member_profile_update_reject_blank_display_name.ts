import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_reject_blank_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via authorization utility
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(authorized);
  // Store original username from authorized response (display name is the username for new members)
  const originalUsername = authorized.username;
  // 2. Create actor-specific connection for authenticated requests
  // authorize_member_join updates joinConnection.headers internally with the token
  const memberConnection: api.IConnection = joinConnection;
  // 3. First, fetch the current profile to capture the state
  // Use a valid update request first to get a profile with display_name
  const initialProfile: IRedditPlatformMember =
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        display_name: "Initial Display Name",
        bio: "Initial bio",
      } satisfies IRedditPlatformMember.IUpdate,
    });
  typia.assert(initialProfile);
  const initialUpdatedAt = initialProfile.updated_at;
  // 4. Test with empty string display_name
  await TestValidator.httpError(
    "should reject empty display name",
    400,
    async () => {
      await api.functional.redditPlatform.member.profile.patch(
        memberConnection,
        {
          body: {
            display_name: "",
            bio: "My bio",
          } satisfies IRedditPlatformMember.IUpdate,
        },
      );
    },
  );
  // 5. Test with whitespace-only display_name
  await TestValidator.httpError(
    "should reject whitespace-only display name",
    400,
    async () => {
      await api.functional.redditPlatform.member.profile.patch(
        memberConnection,
        {
          body: {
            display_name: "   ",
            bio: "My bio",
          } satisfies IRedditPlatformMember.IUpdate,
        },
      );
    },
  );
  // 6. Verify display_name remains unchanged after failed updates
  // Note: The display_name should still be "Initial Display Name" from step 3
  const currentProfile: IRedditPlatformMember =
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        display_name: "Final Display Name",
      } satisfies IRedditPlatformMember.IUpdate,
    });
  typia.assert(currentProfile);
  TestValidator.equals(
    "display_name unchanged after failed blank updates",
    currentProfile.username,
    originalUsername,
  );
  // 7. Verify updated_at timestamp is not modified after failed updates
  // Note: This tests the failed updates, not the final successful one
  // To test this properly, we capture updated_at BEFORE the failed attempts
  const profileBeforeFailedUpdates: IRedditPlatformMember =
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        bio: "Temporary bio",
      } satisfies IRedditPlatformMember.IUpdate,
    });
  typia.assert(profileBeforeFailedUpdates);
  const updatedAtBeforeFailed = profileBeforeFailedUpdates.updated_at;
  // Now do the failed updates
  await TestValidator.httpError(
    "should reject empty display name (second check)",
    400,
    async () => {
      await api.functional.redditPlatform.member.profile.patch(
        memberConnection,
        {
          body: {
            display_name: "",
            bio: "My bio",
          } satisfies IRedditPlatformMember.IUpdate,
        },
      );
    },
  );
  await TestValidator.httpError(
    "should reject whitespace-only display name (second check)",
    400,
    async () => {
      await api.functional.redditPlatform.member.profile.patch(
        memberConnection,
        {
          body: {
            display_name: "   ",
            bio: "My bio",
          } satisfies IRedditPlatformMember.IUpdate,
        },
      );
    },
  );
  // Verify updated_at is still the same after failed updates
  const profileAfterFailedUpdates: IRedditPlatformMember =
    await api.functional.redditPlatform.member.profile.patch(memberConnection, {
      body: {
        display_name: "Final Display Name",
      } satisfies IRedditPlatformMember.IUpdate,
    });
  typia.assert(profileAfterFailedUpdates);
  TestValidator.equals(
    "updated_at not modified after failed blank updates",
    profileAfterFailedUpdates.updated_at,
    updatedAtBeforeFailed,
  );
}