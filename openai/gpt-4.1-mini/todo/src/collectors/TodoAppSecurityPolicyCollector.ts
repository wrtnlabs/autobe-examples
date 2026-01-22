import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSecurityPolicy";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace TodoAppSecurityPolicyCollector {
  export async function collect(props: {
    body: ITodoAppSecurityPolicy.ICreate;
  }) {
    return {
      id: v4(),
      key: props.body.key,
      value: props.body.value,
      description: props.body.description ?? null,
      active: props.body.active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.todo_app_security_policiesCreateInput;
  }
}
