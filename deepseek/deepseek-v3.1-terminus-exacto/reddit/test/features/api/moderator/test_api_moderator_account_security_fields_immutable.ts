import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_account_security_fields_immutable(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a moderator account for authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.communityPlatform.auth.moderator.join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.alphabets(8),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(authorized);
  // Step 2: Attempt to update security fields that should be immutable
  // Attempt to update email (should be immutable according to IUpdate definition)
  await TestValidator.error(
    "email field should be immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - email is not part of IUpdate
            email: "new_email@test.com",
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update username (should be immutable according to IUpdate definition)
  await TestValidator.error(
    "username field should be immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - username is not part of IUpdate
            username: "new_username",
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update id (should be immutable according to IUpdate definition)
  await TestValidator.error(
    "id field should be immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - id is not part of IUpdate
            id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update password (should be immutable according to IUpdate definition)
  await TestValidator.error(
    "password field should be immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - password is not part of IUpdate
            password: "new_password",
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update system-managed fields: is_active
  await TestValidator.error(
    "is_active field should be system-managed and immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - is_active is not part of IUpdate
            is_active: false,
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update system-managed fields: permission_level
  await TestValidator.error(
    "permission_level field should be system-managed and immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - permission_level is not part of IUpdate
            permission_level: "admin",
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update system-managed timestamps: created_at
  await TestValidator.error(
    "created_at field should be system-managed and immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - created_at is not part of IUpdate
            created_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update system-managed timestamps: updated_at
  await TestValidator.error(
    "updated_at field should be system-managed and immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - updated_at is not part of IUpdate
            updated_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update system-managed timestamps: last_login_at
  await TestValidator.error(
    "last_login_at field should be system-managed and immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - last_login_at is not part of IUpdate
            last_login_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Attempt to update system-managed timestamps: deleted_at
  await TestValidator.error(
    "deleted_at field should be system-managed and immutable",
    async () =>
      await api.functional.communityPlatform.moderator.account.update(
        moderatorConnection,
        {
          body: {
            display_name: "Updated Display Name",
            // @ts-expect-error - deleted_at is not part of IUpdate
            deleted_at: new Date().toISOString(),
          } satisfies ICommunityPlatformModerator.IUpdate as any,
        },
      ),
  );
  // Step 3: Verify that valid updates work correctly
  const validUpdate = {
    display_name: "New Valid Display Name",
    bio: "Updated biography text",
    avatar_url: "https://example.com/new-avatar.png" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformModerator.IUpdate;
  const updatedProfile =
    await api.functional.communityPlatform.moderator.account.update(
      moderatorConnection,
      {
        body: validUpdate,
      },
    );
  typia.assert(updatedProfile);
  // Verify the updated fields
  TestValidator.equals(
    "display_name should be updated",
    updatedProfile.display_name,
    validUpdate.display_name,
  );
  TestValidator.equals(
    "bio should be updated",
    updatedProfile.bio,
    validUpdate.bio,
  );
  TestValidator.equals(
    "avatar_url should be updated",
    updatedProfile.avatar_url,
    validUpdate.avatar_url,
  );
  // Verify that security and identity fields remain unchanged
  TestValidator.equals(
    "email should remain unchanged",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals(
    "username should remain unchanged",
    updatedProfile.username,
    authorized.username,
  );
  TestValidator.equals(
    "id should remain unchanged",
    updatedProfile.id,
    authorized.id,
  );
  TestValidator.equals(
    "is_active should remain unchanged",
    updatedProfile.is_active,
    authorized.is_active,
  );
  TestValidator.equals(
    "permission_level should remain unchanged",
    updatedProfile.permission_level,
    authorized.permission_level,
  );
}
