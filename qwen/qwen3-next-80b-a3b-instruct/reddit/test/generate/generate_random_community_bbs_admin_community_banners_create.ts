import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityBanner";
import { prepare_random_community_bbs_community_banner } from "../prepare/prepare_random_community_bbs_community_banner";
export async function generate_random_community_bbs_admin_community_banners_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommunityBanner.ICreate>;
  },
): Promise<ICommunityBbsCommunityBanner> {
  const prepared: ICommunityBbsCommunityBanner.ICreate =
    prepare_random_community_bbs_community_banner(props.body);
  const result: ICommunityBbsCommunityBanner =
    await api.functional.communityBbs.admin.community_banners.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
