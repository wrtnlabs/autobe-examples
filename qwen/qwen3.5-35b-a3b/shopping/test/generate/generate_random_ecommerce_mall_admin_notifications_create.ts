import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_notification } from "../prepare/prepare_random_ecommerce_mall_notification";

export async function generate_random_ecommerce_mall_admin_notifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallNotification.ICreate>;
  },
): Promise<IEcommerceMallNotification> {
  const prepared: IEcommerceMallNotification.ICreate =
    prepare_random_ecommerce_mall_notification(props.body);
  const result: IEcommerceMallNotification =
    await api.functional.ecommerceMall.admin.notifications.create(connection, {
      body: prepared,
    });
  return result;
}
