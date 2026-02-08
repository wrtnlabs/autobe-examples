import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_reports_create } from "../../../generate/generate_random_community_platform_reports_create";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_reported_content_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and authenticates
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  moderatorConnection.headers ??= {};
  moderatorConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Create a report as prerequisite
  const report = await generate_random_community_platform_reports_create(
    moderatorConnection,
    {
      body: undefined,
    },
  );
  typia.assert(report);
  // 3. Erase the reported content link by report key
  await api.functional.communityPlatform.reportedContents.erase(
    moderatorConnection,
    report as any,
  );
}
