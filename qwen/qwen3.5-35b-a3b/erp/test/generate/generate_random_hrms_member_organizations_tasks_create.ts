import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_task } from "../prepare/prepare_random_hrms_task";

const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export async function generate_random_hrms_member_organizations_tasks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsTask.ICreate> | undefined;
    params?: {
      projectId: string;
    };
  },
): Promise<IHrmsTask> {
  const prepared: IHrmsTask.ICreate = prepare_random_hrms_task(props.body);
  const projectId = props.params?.projectId ?? generateUUID();
  const result: IHrmsTask =
    await api.functional.hrms.member.organizations.tasks.create(connection, {
      body: prepared,
      projectId,
    });
  return result;
}