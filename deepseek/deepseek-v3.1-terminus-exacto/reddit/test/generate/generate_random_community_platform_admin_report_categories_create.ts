import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_category } from "../prepare/prepare_random_community_platform_report_category";

export async function generate_random_community_platform_admin_report_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportCategory.ICreate>;
  },
): Promise<ICommunityPlatformReportCategory> {
  const prepared: ICommunityPlatformReportCategory.ICreate =
    prepare_random_community_platform_report_category(props.body);
  const result: ICommunityPlatformReportCategory =
    await api.functional.communityPlatform.admin.report_categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
