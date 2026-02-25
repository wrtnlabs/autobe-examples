import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_admin_demote_other_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator who will perform the demotion
  const demoterConnection: api.IConnection = { host: connection.host };
  const demoter = await authorize_super_administrator_join(demoterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(demoter);
  // Create super administrator to be demoted
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_super_administrator_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(target);
  // Use demoter's connection to demote the target super administrator
  const demotedUser =
    await api.functional.economicBoard.superAdministrator.users.demote(
      demoterConnection,
      { id: target.id },
    );
  typia.assert(demotedUser);
  // Validate the demoted user's profile
  TestValidator.equals("demoted user id matches", demotedUser.id, target.id);
  // After demotion, the user is an IEconomicBoardCitizen and should no longer have is_super_admin property
  TestValidator.predicate(
    "demoted user is now a regular citizen (is_super_admin property should be absent)",
    () => typeof (demotedUser as any).is_super_admin === "undefined"
  );
  TestValidator.predicate(
    "demoted user still has valid email",
    () => demotedUser.email !== null,
  );
  TestValidator.predicate(
    "demoted user has a display name",
    () =>
      demotedUser.display_name !== null ||
      demotedUser.display_name === undefined,
  );
  TestValidator.predicate(
    "demoted user has updated_at timestamp",
    () => demotedUser.updated_at !== undefined,
  );
  TestValidator.predicate(
    "demoted user has created_at timestamp",
    () => demotedUser.created_at !== undefined,
  );
  TestValidator.predicate(
    "demoted user has article_count",
    () => demotedUser.article_count >= 0,
  );
  TestValidator.predicate(
    "demoted user has comment_count",
    () => demotedUser.comment_count >= 0,
  );
  TestValidator.predicate(
    "demoted user is not banned",
    () => demotedUser.is_banned === false,
  );
  TestValidator.equals(
    "demoted user ban_reason is null",
    demotedUser.ban_reason,
    null,
  );
}