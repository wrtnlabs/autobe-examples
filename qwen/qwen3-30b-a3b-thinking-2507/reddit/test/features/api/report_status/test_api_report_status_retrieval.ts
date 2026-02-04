import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatus";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_report_statuses_create } from "../../../generate/generate_random_community_platform_user_report_statuses_create";
import { prepare_random_community_platform_report_status } from "../../../prepare/prepare_random_community_platform_report_status";

export async function test_api_report_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as user for moderation permissions
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: typia.random<string & tags.MinLength<8> & tags.Pattern<"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[!@#$%^&*]).{8,}$">>() satisfies string as string,
      display_name: typia.random<string & tags.MinLength<2> & tags.MaxLength<50> & tags.Pattern<"^[a-zA-Z0-9_-]+$">>() satisfies string as string,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create a new report status to retrieve
  const reportStatus =
    await generate_random_community_platform_user_report_statuses_create(
      userConnection,
      { body: {} } // Fixed the argument
    );
  typia.assert(reportStatus);
  // Step 3: Retrieve the created report status
  const retrievedStatus =
    await api.functional.communityPlatform.user.report_statuses.at(
      userConnection,
      {
        statusId: reportStatus.id,
      },
    );
  typia.assert(retrievedStatus);
  // Step 4: Validate all fields in retrieved response
  TestValidator.equals(
    "report status id matches",
    retrievedStatus.id,
    reportStatus.id,
  );
  TestValidator.equals(
    "report status name matches",
    retrievedStatus.name,
    reportStatus.name,
  );
  TestValidator.equals(
    "report status description matches",
    retrievedStatus.description,
    reportStatus.description,
  );
  TestValidator.equals(
    "report status status matches",
    retrievedStatus.status,
    reportStatus.status,
  );
}