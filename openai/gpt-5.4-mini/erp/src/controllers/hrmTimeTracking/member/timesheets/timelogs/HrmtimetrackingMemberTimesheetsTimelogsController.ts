import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { IHrmTimeTrackingTimesheet } from "../../../../../api/structures/IHrmTimeTrackingTimesheet";
import { IPageIHrmTimeTrackingTimesheet } from "../../../../../api/structures/IPageIHrmTimeTrackingTimesheet";
import { MemberAuth } from "../../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../../decorators/payload/MemberPayload";
import { patchHrmTimeTrackingMemberTimesheetsTimesheetIdTimelogs } from "../../../../../providers/patchHrmTimeTrackingMemberTimesheetsTimesheetIdTimelogs";

@Controller("/hrmTimeTracking/member/timesheets/:timesheetId/timelogs")
export class HrmtimetrackingMemberTimesheetsTimelogsController {
  /**
   * Update the timelog membership of a draft timesheet.
   *
   * This operation lets an employee revise the weekly collection of time entries before submission by adding timelogs to the draft or removing timelogs that should no longer be included. It operates on the weekly timesheet header defined by the organization, employee, week range, and review metadata, while the actual membership of time entries is stored in the separate timesheet-timelog junction table.
   *
   * The timesheet must belong to the currently selected organization context and must be in draft status. Draft timesheets remain editable, while submitted, approved, or rejected records follow the timesheet workflow rules and cannot be freely modified in the same way. When a timesheet is approved, the included timelogs are locked by the approval workflow, so this endpoint must reject changes that would violate that lock. When a draft is created for a week, the existing weekly timelogs for the same Monday-to-Sunday period may be present and can then be refined through this endpoint before submission.
   *
   * The operation is intended for the owning employee to manage their own weekly timesheet contents. Organization-wide time visibility or time-management permissions may allow broader access where the application policy permits it, but the business default is self-service editing of the current employee's draft timesheet. The implementation must ensure every included timelog belongs to the same employee as the timesheet and must not allow cross-employee inclusion.
   *
   * All additions and removals must be validated against the underlying time entry and timesheet rules. A timelog can be linked to at most one timesheet at a time, so attempting to add a timelog that is already attached to a different timesheet must be rejected. Removing a timelog should delete or deactivate the join record only; it must not alter the underlying timelog facts such as work date, duration, project, task, billable flag, or descriptions. The response returns the updated timesheet with its membership information so the client can re-render the draft weekly editor immediately after the change.
   *
   * @param connection
   * @param timesheetId Target timesheet identifier.
   * @param body Timelog add/remove instructions for the draft timesheet.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Load the target timesheet by id within the current organization scope and verify that it belongs to the authenticated employee unless elevated time management permission is present. Confirm the timesheet exists, is not deleted, and is in draft status before allowing any membership changes.
   *
   * Accept a request body that expresses add/remove membership changes for timelogs. For each timelog to add, fetch the timelog record by id and validate: same organization, same employee as the timesheet owner, within the Monday-to-Sunday week covered by the timesheet, not already linked to another timesheet, and not blocked by approval locks or other workflow restrictions. If the timelog already belongs to this timesheet, ignore the duplicate or return a validation error depending on the platform's consistency policy. For each timelog to remove, confirm that the current timesheet actually includes it.
   *
   * Perform the update in a single transaction: load the existing join rows for the timesheet, insert new join rows for added timelogs, and delete or mark inactive the join rows for removed timelogs according to the join-table lifecycle used by the service layer. Recompute any derived totals required for the response, such as included timelog count and summed duration if the timesheet response schema exposes them. If the timesheet transitions or lock behavior requires it, ensure no approved-state invariants are broken.
   *
   * Return the refreshed timesheet aggregate with its current timelog links. Include clear validation failures for cases such as non-draft timesheet, cross-employee timelog, timelog outside the week range, timelog already assigned to another timesheet, or permission denial. Never mutate the underlying timelog fact records during this operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("timesheetId")
    timesheetId: string & tags.Format<"uuid">,
    @TypedBody()
    body: IHrmTimeTrackingTimesheet.ITimelogUpdate,
  ): Promise<IPageIHrmTimeTrackingTimesheet> {
    try {
      return await patchHrmTimeTrackingMemberTimesheetsTimesheetIdTimelogs({
        member,
        timesheetId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
