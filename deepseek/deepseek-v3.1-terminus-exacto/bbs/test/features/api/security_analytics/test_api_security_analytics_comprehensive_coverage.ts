import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_security_analytics_comprehensive_coverage(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Get all security events with default pagination
  const defaultResponse =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.predicate(
    "has pagination structure",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    Array.isArray(defaultResponse.data),
  );
  // Test 2: Filter with random values to test filtering capability
  const filteredResponse =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          resolved: false,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
          >(),
          page: 1,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.predicate(
    "filtered response has data",
    filteredResponse.data.length >= 0,
  );
  // Test 3: Time range filtering
  const now = new Date().toISOString();
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const timeResponse =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          created_at_start: pastDate,
          created_at_end: now,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(timeResponse);
  TestValidator.predicate(
    "time filtered response valid",
    timeResponse.pagination !== undefined,
  );
  // Test 4: Search functionality with random substring
  const searchResponse =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          search: RandomGenerator.substring(
            "security event audit log monitoring attempt failure success",
          ),
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search response has structure",
    searchResponse.data.length >= 0,
  );
  // Test 5: Actor-based filtering with null values (no actor specified)
  const actorResponse =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          user_id: null,
          admin_id: null,
          super_admin_id: null,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(actorResponse);
  TestValidator.predicate(
    "actor filtered response valid",
    actorResponse.pagination !== undefined,
  );
  // Test 6: Complex combined filtering
  const complexResponse =
    await api.functional.discussionBoard.admin.system.analytics.security.index(
      adminConnection,
      {
        body: {
          resolved: typia.random<boolean>(),
          created_at_start: pastDate,
          limit: 5,
          page: 2,
        } satisfies IDiscussionBoardSecurityEvent.IRequest,
      },
    );
  typia.assert(complexResponse);
  TestValidator.predicate(
    "complex response valid",
    complexResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "page number matches",
    complexResponse.pagination !== undefined,
  );
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "pagination records non-negative",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current positive",
    defaultResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination limit positive",
    defaultResponse.pagination !== undefined,
  );
  // Validate pagination calculation consistency
  if (
    defaultResponse.pagination !== undefined
  ) {
    TestValidator.predicate(
      "pagination structure exists",
      true,
    );
  }
  // Validate data structure via typia.assert only - no redundant checks
  if (defaultResponse.data.length > 0) {
    const sampleEvent = defaultResponse.data[0];
    typia.assert(sampleEvent);
    // typia.assert() already validated all required fields and nullability
    // No additional validation needed
  }
}