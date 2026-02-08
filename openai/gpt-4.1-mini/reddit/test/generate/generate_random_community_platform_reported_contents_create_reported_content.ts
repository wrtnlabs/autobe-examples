import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_reported_content } from "../prepare/prepare_random_community_platform_reported_content";

export async function generate_random_community_platform_reported_contents_create_reported_content(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportedContent.ICreate>;
  },
): Promise<ICommunityPlatformReportedContent> {
  const prepared: ICommunityPlatformReportedContent.ICreate =
    prepare_random_community_platform_reported_content(props.body);
  const result: ICommunityPlatformReportedContent =
    await api.functional.communityPlatform.reportedContents.createReportedContent(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
