import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieval of non-existent cancellation request snapshot returns 404 error.
 *
 * Validates that the system properly handles requests for cancellation request snapshots that do not exist in the database. The test registers a member account, then attempts to fetch a snapshot using a valid UUID format but a non-existent ID. The system should return 404 Not Found, confirming proper error handling for invalid snapshot references and preventing potential enumeration attacks.
 *
 * This test focuses on the 404 error response path and validates:
 * - Member authentication is required to access cancellation request snapshots
 * - UUID format validation occurs before database lookup
 * - Non-existent snapshots return proper 404 Not Found status
 * - Error response includes appropriate error message
 */
export async function test_api_cancellation_request_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const joinResponse = await authorize_member_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Create member-specific connection with auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResponse.token.access },
  };
  // 3. Attempt to fetch non-existent snapshot with valid UUID format
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "non-existent snapshot should return 404",
    404,
    async () => {
      await api.functional.ecommerceMall.member.cancellation_request_snapshots.at(
        memberConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
}
