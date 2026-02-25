import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_event_of_customer } from "../prepare/prepare_random_ecommerce_platform_event_of_customer";

export async function generate_random_ecommerce_super_administrator_business_rules_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformEventOfCustomer.ICreate> | undefined;
  },
): Promise<IEcommercePlatformEventOfCustomer> {
  const prepared: IEcommercePlatformEventOfCustomer.ICreate =
    prepare_random_ecommerce_platform_event_of_customer(props.body);
  const result: IEcommercePlatformEventOfCustomer =
    await api.functional.ecommerce.superAdministrator.business_rules.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
