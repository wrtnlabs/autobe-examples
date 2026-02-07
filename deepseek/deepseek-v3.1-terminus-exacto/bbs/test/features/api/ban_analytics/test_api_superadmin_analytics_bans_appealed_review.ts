import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_analytics_bans_appealed_review(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test analytics for bans with pending appeals
  const pendingAppealsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          appeal_status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(pendingAppealsResponse);
  // Test analytics for bans with appeals under review
  const underReviewAppealsResponse =
    await api.functional.discussionBoard.superAdmin.analytics.bans.index(
      superAdminConnection,
      {
        body: {
          appeal_status: "under_review",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserBan.IRequest,
      },
    );
  typia.assert(underReviewAppealsResponse);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    typeof pendingAppealsResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(pendingAppealsResponse.data),
    true,
  );
  // Validate appeal status filtering if data is returned
  if (pendingAppealsResponse.data.length > 0) {
    pendingAppealsResponse.data.forEach((ban, index) => {
      TestValidator.equals(
        `ban ${index} has pending appeal status`,
        ban.appeal_status,
        "pending",
      );
    });
  }
  if (underReviewAppealsResponse.data.length > 0) {
    underReviewAppealsResponse.data.forEach((ban, index) => {
      TestValidator.equals(
        `ban ${index} has under_review appeal status`,
        ban.appeal_status,
        "under_review",
      );
    });
  }
  // Validate ban summary structure contains required fields
  if (pendingAppealsResponse.data.length > 0) {
    const sampleBan = pendingAppealsResponse.data[0];
    TestValidator.predicate(
      "ban has id",
      typeof sampleBan.id === "string" && sampleBan.id.length > 0,
    );
    TestValidator.predicate(
      "ban has reason",
      typeof sampleBan.ban_reason === "string",
    );
    TestValidator.predicate(
      "ban has status",
      typeof sampleBan.ban_status === "string",
    );
    TestValidator.predicate(
      "ban has banned user",
      typeof sampleBan.bannedUser === "object",
    );
    TestValidator.predicate(
      "ban has banning administrator",
      typeof sampleBan.banningAdministrator === "object",
    );
  }
}
