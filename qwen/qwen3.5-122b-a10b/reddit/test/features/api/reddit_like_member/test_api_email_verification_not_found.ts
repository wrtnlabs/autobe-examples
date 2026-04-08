import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test email verification record retrieval for non-existent or soft-deleted records.
 *
 * Validates that the system properly returns 404 Not Found when attempting to retrieve email verification records that do not exist or have been invalidated. This ensures proper handling of missing verification data and maintains data integrity for verification lookups.
 *
 * The test covers the scenario of attempting to access verification records with IDs that were never created, ensuring the API properly rejects such requests with appropriate error codes.
 *
 * 1. Register a new member account with random credentials.
 * 2. Attempt to retrieve email verification using a non-existent UUID.
 * 3. Verify the system returns 404 Not Found error.
 */
export async function test_api_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Attempt to retrieve non-existent verification record
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify 404 Not Found is returned
  await TestValidator.httpError(
    "non-existent verification returns 404",
    404,
    async () => {
      await api.functional.redditLike.member.email_verifications.at(
        memberConnection,
        {
          verificationId: nonExistentId,
        },
      );
    },
  );
}
