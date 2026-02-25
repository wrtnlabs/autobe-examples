import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_email_template } from "../prepare/prepare_random_ecommerce_email_template";

export async function generate_random_ecommerce_super_administrator_email_templates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceEmailTemplate.ICreate>;
    params?: Record<string, never>;
  },
): Promise<IEcommerceEmailTemplate> {
  const prepared: IEcommerceEmailTemplate.ICreate =
    prepare_random_ecommerce_email_template(props.body);
  return await api.functional.ecommerce.superAdministrator.email_templates.create(
    connection,
    { body: prepared },
  );
}
