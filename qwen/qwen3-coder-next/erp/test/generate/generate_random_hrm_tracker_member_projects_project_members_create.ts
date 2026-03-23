import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IHrmTrackerProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProject";
import type { IHrmTrackerProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerProjectMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_tracker_project_member } from "../prepare/prepare_random_hrm_tracker_project_member";

export async function generate_random_hrm_tracker_member_projects_project_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTrackerProjectMember.ICreate>;
    params: {
      projectId: string;
    };
  },
): Promise<IHrmTrackerProjectMember> {
  const prepared: IHrmTrackerProjectMember.ICreate =
    prepare_random_hrm_tracker_project_member(props.body);
  return await api.functional.hrmTracker.member.projects.projectMembers.create(
    connection,
    {
      body: prepared,
      projectId: props.params.projectId,
    },
  );
}
