import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemHealthMetric";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test that the health check endpoint is publicly accessible to guest users without requiring authentication.
 * Verify unauthorized users (guests) can successfully access the endpoint and receive system health information.
 * Ensure the endpoint doesn't require any session tokens or authentication headers.
 */
export async function test_api_guest_health_publicly_accessible_no_auth(
  connection: api.IConnection,
): Promise<void> {
  // Use the base connection directly without authentication
  // This validates that the endpoint is truly publicly accessible
  const healthResponse =
    await api.functional.discussionBoard.guest.health.at(connection);
  // Validate the complete response structure - typia.assert performs complete validation
  typia.assert(healthResponse);
  // Validate that the endpoint can be called multiple times without authentication
  const secondHealthResponse =
    await api.functional.discussionBoard.guest.health.at(connection);
  typia.assert(secondHealthResponse);
  // Business logic validation: Ensure both responses have data arrays
  // This validates the endpoint consistently returns health metrics
  TestValidator.predicate(
    "health response contains data array",
    Array.isArray(healthResponse.data),
  );
  TestValidator.predicate(
    "second health response contains data array",
    Array.isArray(secondHealthResponse.data),
  );
}
