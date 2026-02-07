import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityServiceStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityServiceStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_service_status } from "../prepare/prepare_random_community_service_status";

export async function generate_random_community_admin_service_statuses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityServiceStatus.ICreate> | undefined;
  },
): Promise<ICommunityServiceStatus> {
  const prepared: ICommunityServiceStatus.ICreate =
    prepare_random_community_service_status(props.body);
  return await api.functional.community.admin.service_statuses.create(
    connection,
    {
      body: prepared,
    },
  );
}
