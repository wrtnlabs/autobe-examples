import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrms_file_upload } from "../prepare/prepare_random_hrms_file_upload";

export async function generate_random_hrms_member_upload_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmsFileUpload.ICreate> | undefined;
  },
): Promise<IHrmsFileUpload> {
  const prepared: IHrmsFileUpload.ICreate = prepare_random_hrms_file_upload(
    props.body,
  );
  return await api.functional.hrms.member.upload_requests.create(connection, {
    body: prepared,
  });
}
