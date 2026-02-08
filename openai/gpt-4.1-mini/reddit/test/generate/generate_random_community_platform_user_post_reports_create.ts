import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_report } from "../prepare/prepare_random_community_platform_post_report";

export async function generate_random_community_platform_user_post_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostReport.ICreate> | undefined;
  },
): Promise<ICommunityPlatformPostReport> {
  const prepared: ICommunityPlatformPostReport.ICreate =
    prepare_random_community_platform_post_report(props.body);
  const result: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.user.post_reports.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
