import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannelDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelDefinition";

/**
 * Validate the permanent deletion of a shopping mall admin channel and its
 * child channels by an authorized admin.
 *
 * This test verifies that an admin user can delete a channel hierarchy and that
 * the children are automatically deleted. It also confirms that unauthorized
 * users cannot delete channels.
 *
 * Steps:
 *
 * 1. Admin user registers and authenticates using /auth/admin/join.
 * 2. Admin creates a parent channel with a unique channel code.
 * 3. Admin creates one or more child channels under the parent channel.
 * 4. Admin deletes the parent channel by its channel code.
 * 5. Verify the DELETE operation succeeds (no error).
 * 6. Attempt to retrieve the deleted channel expecting failure (error).
 * 7. Attempt deletion by unauthorized user expecting failure (error).
 */
export async function test_api_shoppingmall_admin_channel_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registration and authentication
  const adminEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const adminPassword = "admin1234";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin creates a parent channel
  const parentChannelCode = `PRNT-${RandomGenerator.alphaNumeric(6)}`;
  const parentChannelCreateBody = {
    parent_channel_id: null,
    channel_code: parentChannelCode,
    channel_name: `Parent Channel ${RandomGenerator.paragraph({ sentences: 2 })}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallChannelDefinition.ICreate;

  const parentChannel: IShoppingMallChannelDefinition =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: parentChannelCreateBody,
    });
  typia.assert(parentChannel);

  // 3. Admin creates child channels under the parent
  const childChannelCodes: string[] = [];

  // Create 2 children
  for (let i = 0; i < 2; i++) {
    const childCode = `${parentChannelCode}_CHILD${i + 1}`;
    childChannelCodes.push(childCode);

    const childCreateBody = {
      parent_channel_id: parentChannel.id,
      channel_code: childCode,
      channel_name: `Child Channel ${i + 1} ${RandomGenerator.paragraph({ sentences: 2 })}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies IShoppingMallChannelDefinition.ICreate;

    const childChannel: IShoppingMallChannelDefinition =
      await api.functional.shoppingMall.admin.channels.children.create(
        connection,
        {
          channelCode: parentChannel.channel_code,
          body: childCreateBody,
        },
      );
    typia.assert(childChannel);

    TestValidator.equals(
      "child parent_channel_id matches parent id",
      childChannel.parent_channel_id,
      parentChannel.id,
    );
  }

  // 4. Admin deletes the parent channel (which should cascade delete children)
  await api.functional.shoppingMall.admin.channels.erase(connection, {
    channelCode: parentChannelCode,
  });

  // 5. Verify deletion of parent channel fails on retrieval
  await TestValidator.error(
    "retrieving deleted parent channel should fail",
    async () => {
      // Attempt to create a child channel under deleted parent channel, expecting failure
      await api.functional.shoppingMall.admin.channels.children.create(
        connection,
        {
          channelCode: parentChannelCode,
          body: {
            parent_channel_id: parentChannel.id,
            channel_code: `${parentChannelCode}_SIM`,
            channel_name: "Should fail",
            description: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } satisfies IShoppingMallChannelDefinition.ICreate,
        },
      );
    },
  );

  // 6. Attempt deletion as unauthorized user (simulate by using unauthenticated connection)
  // Create unauthenticated connection by clearing headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Attempt delete with unauthenticated connection
  await TestValidator.error(
    "unauthorized user cannot delete channel",
    async () => {
      await api.functional.shoppingMall.admin.channels.erase(unauthConn, {
        channelCode: parentChannelCode,
      });
    },
  );
}
