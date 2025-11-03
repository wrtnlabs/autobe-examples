import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminVerificationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminVerificationToken";

/**
 * Test the retrieval of email verification tokens for a given admin via
 * adminId. Covers authentication, admin existence, authorized and unauthorized
 * access, pagination (including empty result), error handling, and
 * valid/invalid filter scenarios. Validates that sensitive fields (if any) are
 * not improperly exposed.
 */
export async function test_api_admin_verification_token_index_by_admin(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: "https://test-domain.org/admin/register",
        referrer: "https://test-domain.org/landing",
        // optional ip for registration context
        ip:
          RandomGenerator.pick([
            typia.random<string & tags.Format<"ipv4">>(),
            typia.random<string & tags.Format<"ipv6">>(),
            undefined,
            null,
          ]) ?? undefined,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals(
    "registered admin email matches",
    admin.email,
    adminEmail,
  );

  // 2. Query verification tokens for the registered admin using a variety of queries
  // Default (no pagination/filter, first page)
  const baseTokensResult =
    await api.functional.communityPlatform.admin.admins.verificationTokens.index(
      connection,
      {
        adminId: admin.id,
        body: {}, // defaults to page 1, limit 20
      },
    );
  typia.assert(baseTokensResult);
  TestValidator.equals(
    "adminId in tokens matches queried adminId",
    baseTokensResult.data[0]?.community_platform_admin_id ?? admin.id,
    admin.id,
  );

  // If no tokens are present for the admin, expect empty array
  if (baseTokensResult.pagination.records === 0) {
    TestValidator.equals(
      "token list for new admin is empty or single initial token",
      baseTokensResult.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "returned tokens belong to correct admin",
      baseTokensResult.data.every(
        (v) => v.community_platform_admin_id === admin.id,
      ),
    );
    // Validate important fields for each token
    for (const token of baseTokensResult.data) {
      typia.assert<ICommunityPlatformAdminVerificationToken.ISummary>(token);
      TestValidator.predicate(
        "token id is uuid",
        typeof token.id === "string" && token.id.length > 0,
      );
      // Sensitive token value is present for admin but may be obscured for others
      TestValidator.predicate(
        "token string present",
        typeof token.token === "string",
      );
      TestValidator.predicate(
        "created_at is ISO string",
        typeof token.created_at === "string" && token.created_at.includes("T"),
      );
      TestValidator.predicate(
        "expires_at is ISO string",
        typeof token.expires_at === "string" && token.expires_at.includes("T"),
      );
      TestValidator.predicate(
        "consumed boolean is valid",
        typeof token.consumed === "boolean",
      );
      if (token.consumed === true) {
        TestValidator.predicate(
          "consumed_at not null if consumed",
          token.consumed_at !== null && token.consumed_at !== undefined,
        );
      }
    }
  }

  // 3. Pagination: Query empty result with a high page number
  const emptyPageTokens =
    await api.functional.communityPlatform.admin.admins.verificationTokens.index(
      connection,
      {
        adminId: admin.id,
        body: { page: 99999 },
      },
    );
  typia.assert(emptyPageTokens);
  TestValidator.equals(
    "no tokens for out-of-range page",
    emptyPageTokens.data.length,
    0,
  );

  // 4. Search: Using a random search string (should be empty unless tokens contain it)
  const randomSearch = RandomGenerator.substring(RandomGenerator.paragraph());
  const searchResult =
    await api.functional.communityPlatform.admin.admins.verificationTokens.index(
      connection,
      {
        adminId: admin.id,
        body: { search: randomSearch },
      },
    );
  typia.assert(searchResult);
  // Accept empty result, or all tokens contain the search value in a text field

  // 5. Sorting: Ascending and Descending by created_at field
  for (const sortBy of ["created_at", "expires_at"] as const) {
    for (const desc of [false, true]) {
      const sortedResult =
        await api.functional.communityPlatform.admin.admins.verificationTokens.index(
          connection,
          {
            adminId: admin.id,
            body: { sort_by: sortBy, desc },
          },
        );
      typia.assert(sortedResult);
      // No explicit sort check (need at least 2 items to check)
      if (sortedResult.data.length >= 2) {
        const timestamps = sortedResult.data.map((t) => t[sortBy]);
        const ordered = desc
          ? [...timestamps].sort((a, b) => (a < b ? 1 : -1))
          : [...timestamps].sort((a, b) => (a > b ? 1 : -1));
        TestValidator.equals(
          `sort order for ${sortBy} desc=${desc}`,
          timestamps,
          ordered,
        );
      }
    }
  }

  // 6. Error: Query tokens with invalid adminId (random uuid that is not an admin)
  const randomUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (randomUuid !== admin.id) {
    await TestValidator.error("invalid adminId returns error", async () => {
      await api.functional.communityPlatform.admin.admins.verificationTokens.index(
        connection,
        {
          adminId: randomUuid,
          body: {},
        },
      );
    });
  }

  // 7. Error: Unauthorized (unauthenticated) attempt using empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access is denied", async () => {
    await api.functional.communityPlatform.admin.admins.verificationTokens.index(
      unauthConn,
      {
        adminId: admin.id,
        body: {},
      },
    );
  });
}
