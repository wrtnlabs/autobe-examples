import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_feature_flag_targeting_rule_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Setup moderator authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  // Setup regular user authentication
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // Test unauthorized access by regular user
  await TestValidator.error(
    "regular user should get 403",
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.erase(
        userConnection,
        {
          featureFlagId: typia.random<string & tags.Format<"uuid">>(),
          environmentId: typia.random<string & tags.Format<"uuid">>(),
          detailId: typia.random<string & tags.Format<"uuid">>(),
          targetingRuleId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  // Test unauthorized access by moderator
  await TestValidator.error(
    "moderator should get 403",
    async () =>
      await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.erase(
        moderatorConnection,
        {
          featureFlagId: typia.random<string & tags.Format<"uuid">>(),
          environmentId: typia.random<string & tags.Format<"uuid">>(),
          detailId: typia.random<string & tags.Format<"uuid">>(),
          targetingRuleId: typia.random<string & tags.Format<"uuid">>(),
        },
      ),
  );
  // Test successful deletion by admin
  await api.functional.communityPlatform.admin.feature_flags.environments.details.targeting_rules.erase(
    adminConnection,
    {
      featureFlagId: typia.random<string & tags.Format<"uuid">>(),
      environmentId: typia.random<string & tags.Format<"uuid">>(),
      detailId: typia.random<string & tags.Format<"uuid">>(),
      targetingRuleId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
