import { IPage } from "./IPage";
import { ITodoAppConfiguration } from "./ITodoAppConfiguration";

export namespace IPageITodoAppConfiguration {
  /**
   * A page.
   *
   * Collection of records with pagination information.
   */
  export type ISummary = {
    /** Page information. */
    pagination: IPage.IPagination;

    /** List of records. */
    data: ITodoAppConfiguration.ISummary[];
  };
}
