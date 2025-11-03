import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";

/**
 * Validates admin registration and community creation workflow.
 *
 * 1. Register/authenticate as a platform admin via /auth/admin/join.
 * 2. Create a new unique community with a lower-case, valid name and allowable
 *    description as an admin.
 * 3. Confirm the community is created correctly, is attributed to this admin, and
 *    field-level constraints all hold.
 */
export async function test_api_admin_community_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register a unique admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<string & tags.MinLength<8>>();
  const adminDisplayName: string = RandomGenerator.name();
  const sessionHref: string =
    "https://admin-onboarding.test/session/" + RandomGenerator.alphaNumeric(8);
  const sessionReferrer: string =
    "https://admin-onboarding.test/landing?ref=" +
    RandomGenerator.alphaNumeric(6);

  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: adminDisplayName,
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminAuth);

  // 2. Create a new unique community as this admin
  // Use strictly lower-case, 8-16 chars, alpha/underscore only
  const rawCommunityName = RandomGenerator.alphaNumeric(12).toLowerCase();
  const communityName = rawCommunityName.replace(/[^a-z0-9_]/g, "");
  const description = RandomGenerator.paragraph({
    sentences: 10,
    wordMin: 3,
    wordMax: 10,
  });

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      {
        body: {
          name: communityName,
          description: description,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);

  // 3. Validate record fields and business rules
  // Must be associated with admin (using admin id)
  TestValidator.equals(
    "creator_user_id matches admin id",
    createdCommunity.creator_user_id,
    adminAuth.id,
  );
  // Name field - lower-case, 3-50 chars, pattern ^[a-zA-Z0-9_]+$
  TestValidator.predicate(
    "community name is lower case string, between 3-50 chars, valid format",
    typeof createdCommunity.name === "string" &&
      createdCommunity.name.length >= 3 &&
      createdCommunity.name.length <= 50 &&
      /^[a-z0-9_]+$/.test(createdCommunity.name),
  );
  // Description - length 1-250, non-empty
  TestValidator.predicate(
    "community description non-empty, 1-250 chars",
    typeof createdCommunity.description === "string" &&
      createdCommunity.description.length >= 1 &&
      createdCommunity.description.length <= 250,
  );
  // Has created_at and updated_at
  TestValidator.predicate(
    "created_at field is ISO 8601 string",
    typeof createdCommunity.created_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+Z$/.test(
        createdCommunity.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at field is ISO 8601 string",
    typeof createdCommunity.updated_at === "string" &&
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]+Z$/.test(
        createdCommunity.updated_at,
      ),
  );
  // Soft-delete must be null/undefined
  TestValidator.equals(
    "deleted_at field is null or undefined (not soft-deleted)",
    createdCommunity.deleted_at,
    null,
  );
}
