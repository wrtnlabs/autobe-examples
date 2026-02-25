import api from "@ORGANIZATION/PROJECT-api";
import type { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_admin_promote_citizen_to_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(superAdmin);
  // 2. Simulate a citizen user with a random UUID ID (no API to create citizen exists)
  const citizenId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const citizenDisplayName = RandomGenerator.name();
  const citizenBio = RandomGenerator.paragraph({ sentences: 2 });
  // 3. Create the promotion request body with IEconomicBoardAdministratorAuditLog
  const promotionReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 20,
  });
  // Create a valid IAdministrator.ISummary for the actor (super admin)
  const actorSummary: IAdministrator.ISummary = {
    id: superAdmin.id,
    email: (superAdmin as any).email,
    display_name: (superAdmin as any).email.split("@")[0], // Create display name from email
    bio: "Super administrator promoting citizen",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IAdministrator.ISummary;
  // Create a valid IUser.ISummary for the target (citizen)
  const targetSummary: IUser.ISummary = {
    id: citizenId,
    display_name: citizenDisplayName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    article_count: 5,
    comment_count: 10,
  } satisfies IUser.ISummary;
  const promotionBody: IEconomicBoardAdministratorAuditLog = {
    id: typia.random<string & tags.Format<"uuid">>(),
    actor_id: superAdmin.id,
    target_id: citizenId,
    action_type: "promote",
    reason: promotionReason,
    ip_address: "127.0.0.1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    actor: actorSummary,
    target: targetSummary,
  } satisfies IEconomicBoardAdministratorAuditLog;
  // 4. Execute the promotion endpoint
  const result: IEconomicBoardCitizen =
    await api.functional.economicBoard.superAdministrator.admin.users.promote_admin.promoteAdmin(
      superAdminConnection,
      {
        userId: citizenId,
        body: promotionBody,
      },
    );
  typia.assert(result);
  // 5. Validate the response matches the citizen structure
  TestValidator.equals("Response has correct citizen ID", result.id, citizenId);
  TestValidator.equals(
    "Citizen display name matches",
    result.display_name,
    citizenDisplayName,
  );
  TestValidator.equals("Citizen bio matches", result.bio, citizenBio);
  TestValidator.equals("Citizen is not banned", result.is_banned, false);
  TestValidator.equals(
    "Citizen email is undefined (not returned after promotion)",
    result.email,
    null,
  );
  TestValidator.predicate(
    "Created at is valid date-time",
    result.created_at !== undefined,
  );
  TestValidator.predicate(
    "Updated at is valid date-time",
    result.updated_at !== undefined,
  );
  TestValidator.equals(
    "Article count matches target summary",
    result.article_count,
    targetSummary.article_count,
  );
  TestValidator.equals(
    "Comment count matches target summary",
    result.comment_count,
    targetSummary.comment_count,
  );
}