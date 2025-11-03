import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminPasswordResetToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminPasswordResetToken";

/**
 * Verify that an authenticated admin can list password reset tokens with proper
 * pagination and handle error scenarios.
 *
 * 1. Register a new admin, capture the resulting adminId.
 * 2. Ensure authentication context is established.
 * 3. Fetch admin password reset tokens via paginated API with the correct adminId,
 *    verify pagination and that returned data matches ISummary spec (id, admin
 *    UUID, token, expires_at, consumed, created_at, consumed_at).
 * 4. Validate presence and type/format of status and timestamps in the response.
 * 5. Attempt to fetch tokens with an invalid adminId and expect error.
 */
export async function test_api_admin_password_reset_tokens_list_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  const href = "https://admin.e2e.test/" + RandomGenerator.alphaNumeric(10);
  const referrer =
    "https://referrer.e2e.test/" + RandomGenerator.alphaNumeric(8);
  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: displayName,
    href,
    referrer,
    ip: null,
  } satisfies ICommunityPlatformAdmin.ICreate;

  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuth);
  const adminId = adminAuth.id;
  typia.assert<typeof adminId>(adminId);

  // 2. Authentication context is now established by join

  // 3. Fetch password reset tokens - paginated list
  const request: ICommunityPlatformAdminPasswordResetToken.IRequest = {
    admin_id: adminId,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  };
  const result: IPageICommunityPlatformAdminPasswordResetToken.ISummary =
    await api.functional.communityPlatform.admin.admins.passwordResetTokens.index(
      connection,
      {
        adminId: adminId,
        body: request,
      },
    );
  typia.assert(result);

  // 4. Validate pagination fields exist and types/formats
  typia.assert<IPage.IPagination>(result.pagination);
  TestValidator.predicate(
    "pagination current is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination page size positive",
    result.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages is at least 1 or 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records count >= 0",
    result.pagination.records >= 0,
  );

  // 5. Validate data entries with required ISummary fields
  for (const token of result.data) {
    typia.assert<ICommunityPlatformAdminPasswordResetToken.ISummary>(token);
    TestValidator.equals(
      "token admin_id matches requested admin",
      token.community_platform_admin_id,
      adminId,
    );
    TestValidator.predicate(
      "created_at is ISO date",
      typeof token.created_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.created_at),
    );
    TestValidator.predicate(
      "expires_at is ISO date",
      typeof token.expires_at === "string" &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.expires_at),
    );
    TestValidator.predicate(
      "id is a uuid",
      typeof token.id === "string" && /[0-9a-fA-F\-]{36}/.test(token.id),
    );
    // consumed_at can be null/undefined or ISO date
    if (token.consumed_at !== null && token.consumed_at !== undefined) {
      TestValidator.predicate(
        "consumed_at is ISO date",
        typeof token.consumed_at === "string" &&
          /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(token.consumed_at),
      );
    }
    TestValidator.predicate(
      "consumed is boolean",
      typeof token.consumed === "boolean",
    );
    TestValidator.predicate(
      "token string exists",
      typeof token.token === "string" && token.token.length > 0,
    );
  }

  // 6. Attempt with invalid adminId - should error
  await TestValidator.error(
    "listing password reset tokens with invalid adminId fails",
    async () => {
      await api.functional.communityPlatform.admin.admins.passwordResetTokens.index(
        connection,
        {
          adminId: typia.random<string & tags.Format<"uuid">>(), // random unrelated UUID
          body: {
            admin_id: typia.random<string & tags.Format<"uuid">>(),
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            page_size: 20 as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          },
        },
      );
    },
  );
}
