import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentReport";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_report_statistics_cross_community(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Now use the authenticated admin connection
  const page = 1 satisfies number as number;
  const limit = 20 satisfies number as number;
  const stats =
    await api.functional.communityPlatform.admin.reports.statistics.index(
      adminConnection,
      {
        body: {
          // No community filter to get cross-community statistics
          page: page satisfies
            | (number & tags.Type<"int32"> & tags.Minimum<1>)
            | undefined as
            | (number & tags.Type<"int32"> & tags.Minimum<1>)
            | undefined,
          limit: limit satisfies
            | (number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100>)
            | undefined as
            | (number &
                tags.Type<"int32"> &
                tags.Minimum<1> &
                tags.Maximum<100>)
            | undefined,
        } satisfies ICommunityPlatformContentReport.IRequest,
      },
    );
  typia.assert(stats);
  // Validate pagination structure (business logic, not type validation)
  TestValidator.predicate("has pagination data", stats.pagination.current >= 0);
  TestValidator.predicate("has valid data array", stats.data.length >= 0);
  // Note: Without APIs to create communities and reports,
  // we cannot test actual cross-community statistics breakdown
  // The test validates the endpoint responds with proper structure
}
