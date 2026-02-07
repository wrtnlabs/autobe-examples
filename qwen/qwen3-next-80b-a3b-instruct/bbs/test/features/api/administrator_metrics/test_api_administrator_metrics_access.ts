import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_metrics_access(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register a new administrator account via join
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePassword123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Call the metrics endpoint using the authenticated connection from join
  const metrics =
    await api.functional.economicBoard.administrator.metrics.index(
      adminConnection,
    );
  typia.assert(metrics);
  // Validate required fields exist
  TestValidator.equals(
    "has totalUsers property",
    "totalUsers" in metrics,
    true,
  );
  TestValidator.equals(
    "has totalArticles property",
    "totalArticles" in metrics,
    true,
  );
  TestValidator.equals(
    "has totalComments property",
    "totalComments" in metrics,
    true,
  );
  TestValidator.equals(
    "has activeCitizenSessions property",
    "activeCitizenSessions" in metrics,
    true,
  );
  TestValidator.equals(
    "has activeAdministratorSessions property",
    "activeAdministratorSessions" in metrics,
    true,
  );
  TestValidator.equals(
    "has activeSuperAdministratorSessions property",
    "activeSuperAdministratorSessions" in metrics,
    true,
  );
  TestValidator.equals(
    "has sectionCreations24h property",
    "sectionCreations24h" in metrics,
    true,
  );
  TestValidator.equals(
    "has sectionDeletions24h property",
    "sectionDeletions24h" in metrics,
    true,
  );
  TestValidator.equals(
    "has activeBans property",
    "activeBans" in metrics,
    true,
  );
  TestValidator.equals(
    "has pendingAdminRequests property",
    "pendingAdminRequests" in metrics,
    true,
  );
  // Validate numeric fields are non-negative integers
  TestValidator.predicate(
    "totalUsers is non-negative",
    (metrics as any).totalUsers >= 0,
  );
  TestValidator.predicate(
    "totalArticles is non-negative",
    (metrics as any).totalArticles >= 0,
  );
  TestValidator.predicate(
    "totalComments is non-negative",
    (metrics as any).totalComments >= 0,
  );
  TestValidator.predicate(
    "activeCitizenSessions is non-negative",
    (metrics as any).activeCitizenSessions >= 0,
  );
  TestValidator.predicate(
    "activeAdministratorSessions is non-negative",
    (metrics as any).activeAdministratorSessions >= 0,
  );
  TestValidator.predicate(
    "activeSuperAdministratorSessions is non-negative",
    (metrics as any).activeSuperAdministratorSessions >= 0,
  );
  TestValidator.predicate(
    "sectionCreations24h is non-negative",
    (metrics as any).sectionCreations24h >= 0,
  );
  TestValidator.predicate(
    "sectionDeletions24h is non-negative",
    (metrics as any).sectionDeletions24h >= 0,
  );
  TestValidator.predicate(
    "activeBans is non-negative",
    (metrics as any).activeBans >= 0,
  );
  TestValidator.predicate(
    "pendingAdminRequests is non-negative",
    (metrics as any).pendingAdminRequests >= 0,
  );
  // Validate that sensitive user information is not included
  TestValidator.equals("no email in response", "email" in metrics, false);
  TestValidator.equals("no password in response", "password" in metrics, false);
  TestValidator.equals(
    "no display_name in response",
    "display_name" in metrics,
    false,
  );
  TestValidator.equals("no bio in response", "bio" in metrics, false);
  TestValidator.equals("no id in response", "id" in metrics, false);
  TestValidator.equals(
    "no createdAt in response",
    "createdAt" in metrics,
    false,
  );
  TestValidator.equals(
    "no updatedAt in response",
    "updatedAt" in metrics,
    false,
  );
  TestValidator.equals(
    "no deletedAt in response",
    "deletedAt" in metrics,
    false,
  );
  TestValidator.equals("no bannedAt in response", "bannedAt" in metrics, false);
  TestValidator.equals(
    "no unbannedAt in response",
    "unbannedAt" in metrics,
    false,
  );
  TestValidator.equals(
    "no sessionId in response",
    "sessionId" in metrics,
    false,
  );
  TestValidator.equals(
    "no refreshToken in response",
    "refreshToken" in metrics,
    false,
  );
  TestValidator.equals("no token in response", "token" in metrics, false);
  TestValidator.equals("no isActive in response", "isActive" in metrics, false);
  TestValidator.equals(
    "no isSuperAdmin in response",
    "isSuperAdmin" in metrics,
    false,
  );
  TestValidator.equals("no status in response", "status" in metrics, false);
}