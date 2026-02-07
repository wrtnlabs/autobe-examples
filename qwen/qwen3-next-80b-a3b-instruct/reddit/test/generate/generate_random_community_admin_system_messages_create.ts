import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_system_message } from "../prepare/prepare_random_community_system_message";

export async function generate_random_community_admin_system_messages_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunitySystemMessage.ICreate> | undefined;
  },
): Promise<ICommunitySystemMessage> {
  const prepared: ICommunitySystemMessage.ICreate =
    prepare_random_community_system_message(props.body);
  return await api.functional.community.admin.system_messages.create(
    connection,
    {
      body: prepared,
    },
  );
}
