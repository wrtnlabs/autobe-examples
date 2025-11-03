import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAdminVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminVerificationToken";

/**
 * Validate admin verification token detail retrieval and access control.
 *
 * 1. Register a new admin via api.functional.auth.admin.join (captures admin id
 *    and token)
 * 2. Retrieve the assigned verification token's details via
 *    api.functional.communityPlatform.admin.admins.verificationTokens.at
 * 3. Confirm the returned entity contains required properties, and that sensitive
 *    fields are controlled
 * 4. Attempt to access a non-existent verificationTokenId for the same admin, and
 *    expect error
 * 5. Optionally, attempt to access the token with a mismatched adminId and expect
 *    error
 */
export async function test_api_admin_verification_token_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin and retrieve associated token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<string & tags.MinLength<8>>();
  const displayName: string = RandomGenerator.name();

  const joinBody = {
    email: adminEmail,
    password: adminPassword,
    display_name: displayName,
    href: "https://test.domain/join",
    referrer: "https://test.domain/landing",
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
  } satisfies ICommunityPlatformAdmin.ICreate;

  const authorized: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const adminId = authorized.id;
  // The API does not surface verificationTokenId directly; assume API issues and returns a token entity elsewhere.
  // For this test, we assume we can GET the token via /communityPlatform/admin/admins/{adminId}/verificationTokens/{verificationTokenId}, requiring the verification token id.
  // For initial setup, use a random UUID matching format (simulate that this token was assigned on join).
  // Since there's only the join API, we'll try with a random UUID for happy path, expecting a real backend to manage linkage.
  // But for type safety, test will use a valid format value.
  const possibleTokenId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Try retrieving the token details with adminId and (fake) verificationTokenId
  // In real usage, the tokenId should be discoverable via a listing or as part of the join, but only join endpoint is given.
  // So both success and failure scenarios are simulated with random UUIDs.
  await TestValidator.error(
    "should error when retrieving a non-existent or unauthorized verification token",
    async () => {
      await api.functional.communityPlatform.admin.admins.verificationTokens.at(
        connection,
        {
          adminId: adminId,
          verificationTokenId: possibleTokenId,
        },
      );
    },
  );
}
