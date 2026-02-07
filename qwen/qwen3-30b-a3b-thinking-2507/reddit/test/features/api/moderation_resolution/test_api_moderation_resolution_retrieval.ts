import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_resolution_retrieval(
  connection: api.IConnection,
) {
  // 1. Admin account setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // 2. Retrieve resolution with random ID
  const resolutionId = typia.random<string & tags.Format<"uuid">>();
  const resolution =
    await api.functional.communityPlatform.admin.resolutions.at(
      adminConnection,
      {
        resolutionId,
      },
    );
  typia.assert(resolution);
  // 3. Validate all required fields exist
  TestValidator.equals("action exists", resolution.action, "approved");
  TestValidator.predicate(
    "valid resolution timestamp",
    resolution.resolution_timestamp.includes("T"),
  );
  TestValidator.equals(
    "report summary exists",
    typeof resolution.report,
    "object",
  );
  TestValidator.equals(
    "moderator summary exists",
    typeof resolution.moderator,
    "object",
  );
  TestValidator.predicate(
    "moderator id format",
    resolution.moderator.id.length === 36,
  );
  TestValidator.predicate(
    "moderator email format",
    resolution.moderator.email.includes("@"),
  );
  TestValidator.predicate(
    "moderator creation timestamp",
    resolution.moderator.created_at.includes("T"),
  );
  TestValidator.predicate(
    "moderator updated timestamp",
    resolution.moderator.updated_at.includes("T"),
  );
}
