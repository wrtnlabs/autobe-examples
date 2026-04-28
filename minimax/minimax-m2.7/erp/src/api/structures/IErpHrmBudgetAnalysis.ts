import { tags } from "typia";

import { IErpHrmProject } from "./IErpHrmProject";

export namespace IErpHrmBudgetAnalysis {
  /**
   * Request body for filtering budget utilization analytics. Supports optional project ID filtering and pagination controls.
   */
  export type IRequest = {
    /**
     * Optional list of project IDs to include in budget analysis. When provided, only projects matching these IDs will be returned.
     *
         * @x-autobe-specification Optional array of UUIDs filtering
         *   erp_hrm_projects.id. When provided, only projects matching these
         *   IDs are included in results. If omitted/null, all projects with
         *   configured budget_hours are returned. Source: erp_hrm_projects.id
         *   WHERE budget_hours IS NOT NULL AND budget_hours > 0.
     */
    projectIds?: (string & tags.Format<"uuid">)[] | undefined;

    /**
     * Target page number to retrieve (1-indexed). Specifies which page of results to return.
     *
         * @x-autobe-specification 1-indexed page number for pagination.
         *   Defaults to 1 if omitted, null, or undefined. Specifies which page
         *   of results to return. Page numbering starts from 1. Requesting a
         *   page beyond available range returns empty data array with valid
         *   pagination metadata.
     */
    page?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;

    /**
     * Maximum number of records to return per page. Controls how many records are included in each page response.
     *
         * @x-autobe-specification Maximum records per page for pagination.
         *   Defaults to 100 if omitted, null, or undefined. Controls how many
         *   records are included in each page response. Server may enforce
         *   upper bounds to prevent excessive resource consumption.
     */
    limit?: null | (number & tags.Type<"int32"> & tags.Minimum<0>) | undefined;
  };

  /**
   * Budget utilization result for a single project with configured budget hours.
   */
  export type IResult = {
    /**
     * The project being analyzed, represented as a summary object with essential project details including name, color, status, and organization context.
     *
         * @x-autobe-specification Direct $ref to IErpHrmProject.ISummary.
         *   Represents the project entity being analyzed for budget
         *   utilization. The project_id comes from erp_hrm_projects.id filtered
         *   by budget_hours IS NOT NULL AND budget_hours > 0.
     */
    project: IErpHrmProject.ISummary;

    /**
     * Total estimated budget hours configured for the project, sourced directly from the project's budget_hours field.
     *
         * @x-autobe-specification Direct mapping from
         *   erp_hrm_projects.budget_hours. Projects with null or zero
         *   budget_hours are excluded from results per operation specification.
     */
    budgetHours: number;

    /**
     * Total hours actually logged against the project, calculated by summing all timelog durations and dividing by 60 to convert minutes to hours.
     *
         * @x-autobe-specification Computed aggregation: JOIN erp_hrm_projects
         *   with erp_hrm_timelogs ON erp_hrm_timelogs.erp_hrm_project_id =
         *   erp_hrm_projects.id. actualHours =
         *   SUM(erp_hrm_timelogs.duration_minutes) / 60. Only includes timelogs
         *   belonging to the authenticated user's organization.
     */
    actualHours: number;

    /**
     * Percentage of budget consumed, calculated as a ratio of actual hours to budget hours, expressed as a decimal value rounded to one place.
     *
         * @x-autobe-specification Computed: utilizationPercentage =
         *   (actualHours / budgetHours) * 100, rounded to one decimal place.
         *   Formula: (SUM(timelogs.duration_minutes) / 60 /
         *   projects.budget_hours) * 100.
     */
    utilizationPercentage: number;

    /**
     * Budget consumption status indicating whether the project is within budget, approaching budget threshold, or has exceeded its allocated hours.
     *
         * @x-autobe-specification Computed from utilizationPercentage:
         *   'within_budget' when utilization < 80, 'approaching_budget' when 80
         *   <= utilization <= 100, 'over_budget' when utilization > 100.
     */
    budgetStatus: "within_budget" | "approaching_budget" | "over_budget";
  };
}
