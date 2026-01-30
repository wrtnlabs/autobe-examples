import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_section } from "../prepare/prepare_random_community_bbs_section";
export async function generate_random_community_bbs_admin_channels_sections_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsSection.ICreate> | undefined;
    params: {
      channelId: string;
    };
  },
): Promise<ICommunityBbsSection> {
  const prepared: ICommunityBbsSection.ICreate =
    prepare_random_community_bbs_section(props.body);
  return await api.functional.communityBbs.admin.channels.sections.create(
    connection,
    {
      body: prepared,
      channelId: props.params.channelId,
    },
  );
}
