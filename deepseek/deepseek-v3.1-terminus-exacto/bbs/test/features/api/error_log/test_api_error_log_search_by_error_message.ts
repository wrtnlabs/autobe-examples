import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_error_log_search_by_error_message(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test trigram matching with partial word patterns
  const trigramTests = [
    { search: "dat", description: "trigram prefix match" },
    { search: "ase", description: "trigram middle match" },
    { search: "err", description: "trigram common substring" },
    { search: "404", description: "trigram numeric pattern" },
    { search: "not found", description: "trigram phrase match" },
  ];
  for (const test of trigramTests) {
    const result =
      await api.functional.discussionBoard.superAdmin.error_logs.index(
        superAdminConnection,
        {
          body: {
            search: test.search,
            page: 1,
            limit: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies IDiscussionBoardErrorLog.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.predicate(
      `trigram search '${test.search}' returns valid response`,
      Array.isArray(result.data),
    );
  }
  // Test empty search (should return all records)
  const emptySearch =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          search: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Test non-matching search
  const nonMatchingSearch =
    await api.functional.discussionBoard.superAdmin.error_logs.index(
      superAdminConnection,
      {
        body: {
          search: "xyz123nonexistenttrigrampattern",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardErrorLog.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  // Validate search result structure
  if (emptySearch.data.length > 0) {
    const sampleLog = emptySearch.data[0];
    typia.assert(sampleLog);
    TestValidator.predicate(
      "log has valid UUID",
      /^[0-9a-f-]{36}$/i.test(sampleLog.id),
    );
    TestValidator.predicate(
      "log has error type",
      sampleLog.error_type.length > 0,
    );
    TestValidator.predicate("log has severity", sampleLog.severity.length > 0);
    TestValidator.predicate(
      "log has environment",
      sampleLog.environment.length > 0,
    );
    TestValidator.predicate(
      "log has valid timestamp",
      sampleLog.occurred_at.length > 0,
    );
  }
}
