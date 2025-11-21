import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBBSReportResult } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReportResult";
import type { ICommunityBBSSearchRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSSearchRequest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBBSReportResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReportResult";

export async function test_api_community_search_invalid_length(
  connection: api.IConnection,
) {
  await TestValidator.error("search term too short should fail", async () => {
    await api.functional.communityBBS.search(connection, { body: "ab" });
  });
  await TestValidator.error("search term too long should fail", async () => {
    await api.functional.communityBBS.search(connection, {
      body: ArrayUtil.repeat(101, () => "a").join(""),
    });
  });
}
