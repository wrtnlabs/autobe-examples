import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_reports_resolution } from "../prepare/prepare_random_community_platform_moderation_reports_resolution";

export async function generate_random_community_platform_admin_reports_resolutions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformModerationReportsResolution.ICreate>
      | undefined;
    params: {
      reportId: string;
    };
  },
): Promise<ICommunityPlatformModerationReportsResolution> {
  const prepared: ICommunityPlatformModerationReportsResolution.ICreate =
    prepare_random_community_platform_moderation_reports_resolution(props.body);
  const result: ICommunityPlatformModerationReportsResolution =
    await api.functional.communityPlatform.admin.reports.resolutions.create(
      connection,
      {
        reportId: props.params.reportId,
        body: prepared,
      },
    );
  return result;
}
